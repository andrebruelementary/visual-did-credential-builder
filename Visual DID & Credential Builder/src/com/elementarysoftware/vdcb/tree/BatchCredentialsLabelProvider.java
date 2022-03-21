package com.elementarysoftware.vdcb.tree;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.util.AbstractMap.SimpleEntry;
import org.eclipse.jface.resource.ImageDescriptor;
import org.eclipse.jface.viewers.ILabelProvider;
import org.eclipse.jface.viewers.ILabelProviderListener;
import org.eclipse.swt.graphics.Image;
import org.eclipse.swt.widgets.Display;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import com.elementarysoftware.prism.Batch;
import com.elementarysoftware.prism.Credential;
import com.elementarysoftware.vdcb.PrismImageRegistry;

public class BatchCredentialsLabelProvider implements ILabelProvider {

	//private PrismImageRegistry ir;
	private Display display;

	public BatchCredentialsLabelProvider(Display d) {
		super();
		display = d;
		/*ir = new PrismImageRegistry();

		try {
			ir.put(PrismImageRegistry.PROPERTY_LIST, ImageDescriptor
					.createFromImage(new Image(display, new FileInputStream(new File("img/property_list.gif")))));
			ir.put(PrismImageRegistry.PROPERTY_OBJECT, ImageDescriptor
					.createFromImage(new Image(display, new FileInputStream(new File("img/property_object.png")))));
			ir.put(PrismImageRegistry.PROPERTY_TEXT, ImageDescriptor
					.createFromImage(new Image(display, new FileInputStream(new File("img/property_text.png")))));
			ir.put(PrismImageRegistry.PROPERTY_NUMBER, ImageDescriptor
					.createFromImage(new Image(display, new FileInputStream(new File("img/property_number.png")))));
		} catch (FileNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}*/

	}

	@Override
	public void addListener(ILabelProviderListener listener) {
		// TODO Auto-generated method stub
		// System.out.println("addListener");

	}

	@Override
	public void dispose() {
		// TODO Auto-generated method stub
		// System.out.println("dispose");

	}

	@Override
	public boolean isLabelProperty(Object element, String property) {
		// TODO Auto-generated method stub
		// System.out.println("isLabelProperty");
		return false;
	}

	@Override
	public void removeListener(ILabelProviderListener listener) {
		// TODO Auto-generated method stub
		// System.out.println("removeListener");
	}

	@Override
	public Image getImage(Object element) {

		/*
		if (element.getClass() == SimpleEntry.class) {
			SimpleEntry<String, Object> se = (SimpleEntry<String, Object>) element;
			if (se.getValue() instanceof Number) {
				return ir.get(PrismImageRegistry.PROPERTY_NUMBER);
			} else if (se.getValue().getClass() == String.class) {
				return ir.get(PrismImageRegistry.PROPERTY_TEXT);
			} else if (se.getValue().getClass() == JSONObject.class) {
				return ir.get(PrismImageRegistry.PROPERTY_OBJECT);
			} else if (se.getValue().getClass() == JSONArray.class) {
				return ir.get(PrismImageRegistry.PROPERTY_LIST);
			}
		} else if (element.getClass() == String.class) {
			return ir.get(PrismImageRegistry.PROPERTY_TEXT);
		} else if (element instanceof Number) {
			return ir.get(PrismImageRegistry.PROPERTY_NUMBER);
		} else {
			System.out.println(
					"CredentialBuilderLabelProvider: No image configured for class " + element.getClass().toString());
		}*/
		return null;
	}

	@Override
	public String getText(Object element) {

		if (element instanceof Batch) {
			return ((Batch)element).getId();
		} 
		else if (element instanceof Credential) {
			return ((Credential)element).getHolder();
		} else {
			System.out.println(
					"BatchCredentialsLabelProvider: No text configured for class " + element.getClass().toString());
		}

		return element.toString();
	}

}
