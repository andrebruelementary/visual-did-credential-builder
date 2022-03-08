package com.elementarysoftware.vdcb.tree;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import org.eclipse.jface.resource.ImageDescriptor;
import org.eclipse.jface.viewers.ILabelProvider;
import org.eclipse.jface.viewers.ILabelProviderListener;
import org.eclipse.swt.graphics.Image;
import org.eclipse.swt.widgets.Display;

import com.elementarysoftware.vdcb.PrismImageRegistry;

import io.iohk.atala.prism.identity.PrismKeyType;

public class DIDDataModelTreeLabelProvider implements ILabelProvider {

	private PrismImageRegistry ir; 
	private static final int TYPE_MASTER_KEY = PrismKeyType.INSTANCE.getMASTER_KEY();
	private static final int TYPE_ISSUING_KEY = PrismKeyType.INSTANCE.getISSUING_KEY();
	private static final int TYPE_REVOCATION_KEY = PrismKeyType.INSTANCE.getREVOCATION_KEY();
	private Display display;


	public DIDDataModelTreeLabelProvider(Display d) {
		super();
		display = d;
		ir = new PrismImageRegistry();



		try {
			ir.put(PrismImageRegistry.MASTER_KEY, ImageDescriptor.createFromImage(new Image(display, new FileInputStream(new File("img/master_key.gif")))));
			ir.put(PrismImageRegistry.ISSUING_KEY, ImageDescriptor.createFromImage(new Image(display, new FileInputStream(new File("img/issuing_key.gif")))));
			ir.put(PrismImageRegistry.REVOCATION_KEY, ImageDescriptor.createFromImage(new Image(display, new FileInputStream(new File("img/revocation_key.gif")))));
			ir.put(PrismImageRegistry.ADDED_DATE, ImageDescriptor.createFromImage(new Image(display, new FileInputStream(new File("img/added_date.gif")))));
			ir.put(PrismImageRegistry.REVOKED_DATE, ImageDescriptor.createFromImage(new Image(display, new FileInputStream(new File("img/revoked_date.gif")))));
		} catch (FileNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

		//InputStream is = DIDDataModelTreeLabelProvider.class.getResourceAsStream(filepath);

		//Image masterimage = new Image(display, is);
		//ir.put(PrismImageRegistry.MASTER_KEY, ImageDescriptor.createFromImage(masterimage));

		//ir.put(PrismImageRegistry.ISSUING_KEY, ImageDescriptor.createFromImage(new Image(display, PrismImageRegistry.class.getClassLoader().getResourceAsStream("img/issuing_key.png"))));
	}

	@Override
	public void addListener(ILabelProviderListener listener) {
		// TODO Auto-generated method stub
		//System.out.println("addListener");

	}

	@Override
	public void dispose() {
		// TODO Auto-generated method stub
		//System.out.println("dispose");

	}

	@Override
	public boolean isLabelProperty(Object element, String property) {
		// TODO Auto-generated method stub
		//System.out.println("isLabelProperty");
		return false;
	}

	@Override
	public void removeListener(ILabelProviderListener listener) {
		// TODO Auto-generated method stub
		//System.out.println("removeListener");
	}

	@Override
	public Image getImage(Object element) {
		//System.out.println("getImage "+ element.getClass().toString());
		if(element.getClass() == PrismKeyTreeObject.class) {
			PrismKeyTreeObject to = (PrismKeyTreeObject) element;
			if(to.getType() == TYPE_MASTER_KEY) {
				//System.out.println("get master image");
				return ir.get(PrismImageRegistry.MASTER_KEY);
			}
			else if(to.getType() == TYPE_ISSUING_KEY) {
				//System.out.println("get issuing image");
				return ir.get(PrismImageRegistry.ISSUING_KEY);
			}
			else if(to.getType() == TYPE_REVOCATION_KEY) {
				//System.out.println("get revocation key image");
				return ir.get(PrismImageRegistry.REVOCATION_KEY);
			}
		}
		else if(element.getClass() == PrismTimestampTreeObject.class) {
			PrismTimestampTreeObject to = (PrismTimestampTreeObject) element;

			if(to.getType() == PrismTimestampTreeObject.TYPE_ADDED) {
				return ir.get(PrismImageRegistry.ADDED_DATE);
			}
			else if(to.getType() == PrismTimestampTreeObject.TYPE_REVOKED) {
				return ir.get(PrismImageRegistry.REVOKED_DATE);
			}
		}
		else {
			System.out.println("DIDDataModelTreeLabelProvider: No image configured for class "+ element.getClass().toString());
		}
		return null;
	}

	@Override
	public String getText(Object element) {
		//System.out.println("getText "+ element.getClass().toString());

		if(element.getClass() == PrismKeyTreeObject.class) {
			PrismKeyTreeObject to = (PrismKeyTreeObject) element;
			return to.getName();

		}
		else if(element.getClass() == PrismTimestampTreeObject.class) {
			PrismTimestampTreeObject to = (PrismTimestampTreeObject) element;
			return to.getText();
		}
		else {
			System.out.println("DIDDataModelTreeLabelProvider: No text configured for class "+ element.getClass().toString());
		}

		return element.toString();
	}

}
