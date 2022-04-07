package com.elementarysoftware.vdcb;

import java.util.List;
import java.util.Vector;

import org.eclipse.jface.dialogs.Dialog;
import org.eclipse.jface.dialogs.IDialogConstants;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.graphics.Point;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.Combo;
import org.eclipse.jface.viewers.ComboViewer;
import org.eclipse.swt.SWT;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.widgets.Text;

import com.elementarysoftware.prism.DID;
import com.elementarysoftware.prism.DIDKeyInfo;
import com.elementarysoftware.prism.jobs.UpdateDIDJob;
import com.elementarysoftware.vdcb.tree.actions.JSONAction;

import io.iohk.atala.prism.identity.PrismDid;
import io.iohk.atala.prism.identity.PrismKeyInformation;
import io.iohk.atala.prism.identity.PrismKeyType;

public class AddArrayDialog extends Dialog {
	private Text textArrayName;
	
	//private String selectedType;
	private String arrayName;
	
	//private Class primitiveType = Object.class;
	//private int keyIndex = -1;
	//private DID did;

	/**
	 * Create the dialog.
	 * 
	 * @param parentShell
	 */
	public AddArrayDialog(Shell parentShell) {
		super(parentShell);
	}

	/**
	 * Create contents of the dialog.
	 * 
	 * @param parent
	 */
	@Override
	protected Control createDialogArea(Composite parent) {
		Composite container = (Composite) super.createDialogArea(parent);
		GridLayout gridLayout = (GridLayout) container.getLayout();
		gridLayout.numColumns = 3;

		/*List<String> primitiveTypes = new Vector<String>();
		primitiveTypes.add(JSONAction.PRIMITIVE_TYPE_STRING);
		primitiveTypes.add(JSONAction.PRIMITIVE_TYPE_INTEGER);
		primitiveTypes.add(JSONAction.PRIMITIVE_TYPE_DOUBLE);*/

		new Label(container, SWT.NONE);

		Label lblName = new Label(container, SWT.NONE);
		lblName.setLayoutData(new GridData(SWT.RIGHT, SWT.CENTER, false, false, 1, 1));
		lblName.setText("Name");

		textArrayName = new Text(container, SWT.BORDER);
		textArrayName.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));

		return container;
	}

	/**
	 * Create contents of the button bar.
	 * 
	 * @param parent
	 */
	@Override
	protected void createButtonsForButtonBar(Composite parent) {
		createButton(parent, IDialogConstants.OK_ID, IDialogConstants.OK_LABEL, true);
		createButton(parent, IDialogConstants.CANCEL_ID, IDialogConstants.CANCEL_LABEL, false);
	}

	/**
	 * Return the initial size of the dialog.
	 */
	@Override
	protected Point getInitialSize() {
		return new Point(450, 300);
	}

	@Override
	protected void okPressed() {

		// check value has been provided
		if (textArrayName.getText().trim().equals("")) {
			MessageDialog.openWarning(getParentShell(), "No name provided", "Please provide name to continue");
			return;
		}
		
		//selectedType = comboPrimitiveType.getItem(comboPrimitiveType.getSelectionIndex());
		arrayName = textArrayName.getText().trim();

		super.okPressed();
	}

	/*public String getSelectedType() {
		return selectedType;
	}*/

	public String getArrayName() {
		return arrayName;
	}

}
